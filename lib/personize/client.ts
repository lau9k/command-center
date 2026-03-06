import { Personize } from "@personize/sdk";

const client = new Personize({
  secretKey: process.env.PERSONIZE_SECRET_KEY!,
});

export default client;
