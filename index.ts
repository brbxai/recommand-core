import type { RecommandApp } from "@recommand/lib/app";
import { Server } from "@recommand/lib/api";
import { Logger } from "@recommand/lib/logger";
import { db } from "@recommand/db";
import { migrations } from "@recommand/db/schema";
import signup from "api/auth/signup";
import login from "api/auth/login";

let logger: Logger;

const server = new Server();

export async function init(app: RecommandApp, server: Server) {
  logger = new Logger(app);
  logger.info("Initializing core app");
}

server.get("/tasks", async (c) => {
  logger.warn("Tasks are being fetched!");
  return c.json({
    message: `Tasks!!`,
    migrations: await db.select().from(migrations),
  });
});

server.route("/", signup);
server.route("/", login);

export default server;
