import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const headersObj = Object.fromEntries(req.headers.entries());
    console.log(
      "Incoming request headers:",
      JSON.stringify(
        {
          ...headersObj,
          authorization: headersObj.authorization ? "<present>" : "<missing>",
        },
        null,
        2
      )
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader =
      req.headers.get("Authorization") ?? req.headers.get("authorization");
    const apiKeyHeader =
      req.headers.get("apikey") ?? req.headers.get("x-api-key");

    if (!authHeader) {
      console.error("Missing Authorization header in request");
      return new Response(
        JSON.stringify({
          error: "Missing Authorization header",
          details: "No Authorization header",
          auth_present: false,
          apikey_present: Boolean(apiKeyHeader),
          header_keys: Object.keys(headersObj),
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : authHeader.trim();

    if (!token) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: "Empty access token",
          auth_present: true,
          auth_length: authHeader.length,
          apikey_present: Boolean(apiKeyHeader),
          header_keys: Object.keys(headersObj),
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("User authorization failed:", {
        message: userError?.message,
        status: (userError as { status?: number } | null)?.status,
        name: (userError as { name?: string } | null)?.name,
      });
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: userError?.message || "Could not verify user",
          auth_present: true,
          auth_length: authHeader.length,
          token_length: token.length,
          auth_prefix: authHeader.slice(0, 10),
          apikey_present: Boolean(apiKeyHeader),
          header_keys: Object.keys(headersObj),
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { file_data, file_type, file_name } = await req.json();

    if (!file_data) {
      return new Response(JSON.stringify({ error: "No file data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Gemini API Key
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("gemini_api_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
    }

    const geminiApiKey = settings?.gemini_api_key;

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          error:
            "Gemini API Key не настроен. Пожалуйста, добавьте его в настройках профиля.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get Categories
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", user.id);

    const categoriesList =
      categories?.map((c: { name: string }) => c.name).join(", ") || "";

    const prompt = `Analyze this receipt. Extract:
1. Merchant name
2. Date (ISO format, use current date if not specified. Current date: ${new Date().toISOString()})
3. Total amount
4. Currency (3-letter code, e.g., RUB, USD, default to RUB if unsure)
5. Individual line items (name, amount, category_suggestion)

Available categories to choose from: ${categoriesList}

Return ONLY a JSON object in this format:
{
  "merchant": "string",
  "date": "string",
  "total_amount": number,
  "currency": "string",
  "category_suggestion": "string",
  "items": [
    { "name": "string", "amount": number, "category_suggestion": "string" }
  ]
}

If you cannot find some info, leave it as null or empty string for merchant/date.
If no items found, return an empty array.
Try to match category_suggestion (both top-level and for items) to one of the provided categories if it fits.`;

    let contents: Array<{ parts: Array<Record<string, unknown>> }> = [];
    if (file_type.startsWith("image/")) {
      contents = [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: file_type,
                data: file_data,
              },
            },
          ],
        },
      ];
    } else {
      // Assume text or EML
      // Correctly decode base64 to UTF-8 string
      const binaryString = atob(file_data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const textContent = new TextDecoder().decode(bytes);

      contents = [
        {
          parts: [
            { text: prompt },
            { text: `File name: ${file_name}\n\nContent:\n${textContent}` },
          ],
        },
      ];
    }

    // Gemini API key from AI Studio works best with v1beta + x-goog-api-key header.
    // 1) List models available for this key
    const modelsResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models",
      {
        headers: {
          "x-goog-api-key": geminiApiKey,
        },
      }
    );

    if (!modelsResponse.ok) {
      let errorData: any = null;
      try {
        errorData = await modelsResponse.json();
      } catch {
        // ignore
      }
      throw new Error(
        errorData?.error?.message || "Не удалось получить список моделей Gemini"
      );
    }

    const modelsPayload = (await modelsResponse.json()) as {
      models?: Array<{
        name: string;
        supportedActions?: string[];
        supportedGenerationMethods?: string[];
      }>;
    };

    const supportsGenerateContent = (m: {
      supportedActions?: string[];
      supportedGenerationMethods?: string[];
    }) => {
      if ((m.supportedActions ?? []).includes("generateContent")) return true;
      return (m.supportedGenerationMethods ?? []).includes("generateContent");
    };

    const generateModels = (modelsPayload.models ?? []).filter(
      supportsGenerateContent
    );

    if (generateModels.length === 0) {
      const sample = (modelsPayload.models ?? []).slice(0, 5).map((m) => ({
        name: m.name,
        supportedActions: m.supportedActions ?? null,
        supportedGenerationMethods: m.supportedGenerationMethods ?? null,
      }));

      throw new Error(
        `Для этого Gemini API Key не найдено ни одной модели с поддержкой generateContent. Models count: ${(modelsPayload.models ?? []).length}. Sample: ${JSON.stringify(
          sample
        )}`
      );
    }

    const preferred = generateModels.find((m) =>
      m.name.toLowerCase().includes("flash")
    );
    const chosenModel = preferred?.name ?? generateModels[0].name;

    // 2) Call generateContent
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${chosenModel}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiApiKey,
        },
        body: JSON.stringify({
          contents,
        }),
      }
    );

    if (!response.ok) {
      let errorData: any = null;
      try {
        errorData = await response.json();
      } catch {
        // ignore
      }
      const msg = errorData?.error?.message || "Ошибка при вызове Gemini API";
      throw new Error(`${msg} (model=${chosenModel})`);
    }

    const result = await response.json();

    if (!result.candidates || result.candidates.length === 0) {
      throw new Error(
        "Gemini не вернул результат. Возможно, запрос был заблокирован фильтрами безопасности."
      );
    }

    let text = result.candidates[0].content.parts[0].text;
    // Extract JSON if it's wrapped in markdown or other text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }

    const parsedResult = JSON.parse(text);

    return new Response(JSON.stringify(parsedResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing receipt:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
