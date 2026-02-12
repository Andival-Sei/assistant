import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Mock AI Service (OpenAI Vision compatible)
const processReceiptWithAI = async (imageUrl: string) => {
  // In production, you would call OpenAI API here:
  // const response = await openai.chat.completions.create({
  //   model: "gpt-4-vision-preview",
  //   messages: [ ... ],
  // });

  console.log("Processing image with AI:", imageUrl);

  // Mock response
  return {
    amount: 1540.0,
    currency: "RUB",
    date: new Date().toISOString(),
    description: "Супермаркет 'Пятерочка'",
    items: [
      { name: "Молоко", price: 80 },
      { name: "Хлеб", price: 40 },
    ],
    category_suggestion: "Продукты",
  };
};

serve(async (req: Request) => {
  try {
    const { receipt_url } = await req.json();

    if (!receipt_url) {
      return new Response(
        JSON.stringify({ error: "No receipt URL provided" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("Processing receipt:", receipt_url);

    // Simulate AI delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const result = await processReceiptWithAI(receipt_url);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
