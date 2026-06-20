import app from "./app";
import { env } from "./config/env";

app.listen(env.port, () => {
  console.log(`East Medical TPA backend listening on port ${env.port} (${env.nodeEnv})`);
});
