import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Wallet, Check, ChevronLeft } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/lib/services/finance-service";
import { cn } from "@/lib/utils";

const currencies = [
  { code: "RUB", symbol: "₽", name: "Российский рубль" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "KZT", symbol: "₸", name: "Тенге" },
  { code: "BYN", symbol: "Br", name: "Белорусский рубль" },
];

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    currency: "RUB",
    walletName: "",
    balance: "",
  });

  const queryClient = useQueryClient();

  const createWalletMutation = useMutation({
    mutationFn: financeService.createWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      onComplete();
    },
    onError: (error) => {
      console.error("Failed to create wallet:", error);
      alert("Ошибка при создании счета: " + error.message);
    },
  });

  const handleNext = () => {
    if (step === 2) {
      createWalletMutation.mutate({
        name: data.walletName || "Основной",
        currency: data.currency,
        balance: Number(data.balance) || 0,
        // We'll let the user user_id be inferred from auth or added by service if RLS active
        // Typically service handles `auth.uid()` via RLS, or we pass it if we have it.
        // We rely on RLS and default UUID gen in DB.
      });
    } else {
      setStep((s) => s + 1);
    }
  };

  const steps = [
    // Step 0: Welcome
    <div
      key="step-0"
      className="flex flex-col items-center text-center space-y-6"
    >
      <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Wallet className="h-12 w-12 text-primary" />
      </div>
      <h2 className="text-3xl font-bold">Добро пожаловать в Финансы</h2>
      <p className="text-muted-foreground text-lg max-w-sm">
        Давайте настроим ваше рабочее пространство. Это займет меньше минуты.
      </p>
      <Button
        size="lg"
        onClick={handleNext}
        className="w-full max-w-xs rounded-xl text-lg h-12"
      >
        Начать
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>,

    // Step 1: Currency
    <div key="step-1" className="flex flex-col space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Выберите валюту</h2>
        <p className="text-muted-foreground">
          Основная валюта для вашего первого счета
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {currencies.map((curr) => (
          <button
            key={curr.code}
            onClick={() => setData({ ...data, currency: curr.code })}
            className={cn(
              "flex items-center justify-between p-4 rounded-xl border transition-all text-left group",
              data.currency === curr.code
                ? "border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(var(--primary),1)]"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background border text-lg font-bold">
                {curr.symbol}
              </span>
              <div>
                <div className="font-semibold">{curr.code}</div>
                <div className="text-xs text-muted-foreground">{curr.name}</div>
              </div>
            </div>
            {data.currency === curr.code && (
              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>

      <Button size="lg" onClick={handleNext} className="w-full rounded-xl">
        Далее
      </Button>
    </div>,

    // Step 2: Wallet Details
    <div key="step-2" className="flex flex-col space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Создание счета</h2>
        <p className="text-muted-foreground">
          Назовите свой счет и укажите текущий баланс
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Название счета
          </label>
          <Input
            placeholder="Например: Основной, Tinkoff, Наличные"
            value={data.walletName}
            onChange={(e) => setData({ ...data, walletName: e.target.value })}
            className="h-12 text-lg rounded-xl"
            autoFocus
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Текущий баланс
          </label>
          <div className="relative">
            <Input
              type="number"
              placeholder="0"
              value={data.balance}
              onChange={(e) => setData({ ...data, balance: e.target.value })}
              className="h-12 text-lg rounded-xl pl-4 pr-12"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
              {currencies.find((c) => c.code === data.currency)?.symbol}
            </div>
          </div>
        </div>
      </div>

      <Button
        size="lg"
        onClick={handleNext}
        disabled={createWalletMutation.isPending || !data.walletName}
        className="w-full rounded-xl"
      >
        {createWalletMutation.isPending ? "Создаем..." : "Готово"}
      </Button>
    </div>,
  ];

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="mb-8 flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Назад
          </button>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>

        {/* Step Indicators */}
        {step > 0 && (
          <div className="flex justify-center gap-2 mt-8">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step ? "w-8 bg-primary" : "w-1.5 bg-border"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
