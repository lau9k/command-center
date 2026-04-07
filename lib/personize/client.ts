import { Personize } from "@personize/sdk";

export { PERSONIZE_API_BASE, PERSONIZE_API_KEY, CONTACTS_COLLECTION_ID } from "./config";

const client = new Personize({
  secretKey: process.env.PERSONIZE_SECRET_KEY!,
});

export default client;
