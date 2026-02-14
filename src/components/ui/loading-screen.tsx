import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="relative flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-primary/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-t-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm font-medium text-muted-foreground"
        >
          Загрузка...
        </motion.p>
      </div>
    </div>
  );
}
