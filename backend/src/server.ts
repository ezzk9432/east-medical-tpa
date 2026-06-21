import app from "./app";
import { env } from "./config/env";
import { startRetentionScheduler } from "./services/retention.service";

app.listen(env.port, () => {
  console.log(`East Medical TPA backend listening on port ${env.port} (${env.nodeEnv})`);

  if (env.nodeEnv === "production") {
    startRetentionScheduler();
  }
});
