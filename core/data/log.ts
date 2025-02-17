import fs from "fs";
import path from "path";

import { getDevDataFilePath } from "../util/paths.js";
import { Core } from "../core.js";
import {
  allDevEventNames,
  DataLogLevel,
  DevDataLogEvent,
  devDataVersionedSchemas,
} from "@continuedev/config-yaml";
import { fetchwithRequestOptions } from "@continuedev/fetch";
import { joinPathsToUri } from "../util/uri.js";
import * as URI from "uri-js";
import { fileURLToPath } from "url";

const DEFAULT_DEV_DATA_LEVEL: DataLogLevel = "all";
export const LOCAL_DEV_DATA_VERSION = "0.2.0";
export class DataLogger {
  private static instance: DataLogger | null = null;
  core?: Core;

  private constructor() {}

  public static getInstance(): DataLogger {
    if (DataLogger.instance === null) {
      DataLogger.instance = new DataLogger();
    }
    return DataLogger.instance;
  }

  addBaseValues(body: object, schema: string): object {
    if ("createdAt" in body) {
      body.createdAt = new Date().toISOString();
    }
    if ("schema" in body) {
      body.schema = schema;
    }
    if ("userAgent" in body) {
      body.userAgent = navigator.userAgent; // TODO sufficient user agent info?
    }
    if ("selectedProfileId" in body) {
      body.selectedProfileId =
        this.core?.configHandler.currentProfile?.profileDescription.id ?? "";
    }
    if ("userId" in body) {
      body.userId = "not-implemented";
    }

    return body;
  }

  async logDevData(event: DevDataLogEvent) {
    // Local logs (always on for all levels)
    try {
      const filepath: string = getDevDataFilePath(
        event.name,
        LOCAL_DEV_DATA_VERSION,
      );
      const localSchema =
        devDataVersionedSchemas[LOCAL_DEV_DATA_VERSION]["all"][event.name];
      const parsed = localSchema?.safeParse(event.data);
      if (parsed?.success) {
        const withBaseValues = this.addBaseValues(
          parsed.data,
          LOCAL_DEV_DATA_VERSION,
        );
        fs.writeFileSync(filepath, `${JSON.stringify(withBaseValues)}\n`, {
          flag: "a",
        });
      }
    } catch (error) {
      console.error("Error logging local dev data:", error);
    }

    // Remote logs
    const config = (await this.core?.configHandler.loadConfig())?.config;
    if (config?.data?.length) {
      await Promise.allSettled(
        config.data.map(async (dataConfig) => {
          try {
            // First extract the data schema based on the version and level
            const { schema } = dataConfig;

            const level = dataConfig.level ?? DEFAULT_DEV_DATA_LEVEL;

            // Skip event if `events` is specified and does not include the event
            const events = dataConfig.events ?? allDevEventNames;
            if (!events.includes(event.name)) {
              return;
            }

            const versionSchemas = devDataVersionedSchemas[schema];
            if (!versionSchemas) {
              throw new Error(
                `Attempting to log dev data to non-existent version ${schema}`,
              );
            }

            const levelSchemas = versionSchemas[level];
            if (!levelSchemas) {
              throw new Error(
                `Attempting to log dev data at level ${level} for version ${schema} which does not exist`,
              );
            }

            const zodSchema = levelSchemas[event.name];
            if (!zodSchema) {
              throw new Error(
                `Attempting to log dev data for event ${event.name} at level ${level} for version ${schema}: no schema found`,
              );
            }

            const parsed = zodSchema.safeParse(event.data);
            if (!parsed.success) {
              throw new Error(
                `Failed to parse event data ${parsed.error.toString()}`,
              );
            }

            // Add base values like createdAt etc. if keys present in body
            const payload = this.addBaseValues(parsed.data, schema);

            const uriComponents = URI.parse(dataConfig.destination);

            // Send to remote server
            if (
              uriComponents.scheme === "https" ||
              uriComponents.scheme === "http"
            ) {
              const headers: Record<string, string> = {
                "Content-Type": "application/json",
              };
              if (dataConfig.apiKey) {
                headers["Authorization"] = `Bearer ${dataConfig.apiKey}`;
              }

              // For Continue events, overwrite the access token
              if (uriComponents.host?.endsWith(".continue.dev")) {
                //
                const accessToken =
                  await this.core?.controlPlaneClient.getAccessToken();
                headers["Authorization"] = `Bearer ${accessToken}`;
              }
              const profileId =
                this.core?.configHandler.currentProfile?.profileDescription
                  .id ?? "";
              const response = await fetchwithRequestOptions(
                dataConfig.destination,
                {
                  method: "POST",
                  headers,
                  body: JSON.stringify({
                    name: event.name,
                    data: payload,
                    schema,
                    level,
                    profileId,
                  }),
                },
                dataConfig.requestOptions,
              );
              if (!response.ok) {
                throw new Error(
                  `Post request failed. ${response.status}: ${response.statusText}`,
                );
              }
            } else if (uriComponents.scheme === "file") {
              // Write to jsonc file for local file URIs
              const dirUri = joinPathsToUri(dataConfig.destination, schema);
              const dirPath = fileURLToPath(dirUri);

              if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
              }
              const filepath = path.join(dirPath, `${event.name}.jsonl`);
              const jsonLine = JSON.stringify(event.data);
              fs.writeFileSync(filepath, `${jsonLine}\n`, { flag: "a" });
            } else {
              throw new Error(`Unsupported URI scheme ${uriComponents.scheme}`);
            }
          } catch (error) {
            console.error(
              `Error logging data to ${dataConfig.destination}: ${error instanceof Error ? error.message : error}`,
            );
          }
        }),
      );
    }
  }
}
