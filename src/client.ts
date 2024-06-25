import "dotenv/config";

import { getPresence, loadEvents } from "@elara-services/botbuilder";
import { GitHub } from "@elara-services/github";
import { getFilesList, times } from "@elara-services/utils";
import {
    Client,
    IntentsBitField,
    Options,
    type ActivityType,
    type PresenceData,
} from "discord.js";
import * as events from "./plugins/events";
import { checkIfDeploy } from "./scripts/checks";
if (process.env.timeZone) {
    times.timeZone = process.env.timeZone;
}

declare module "discord.js" {
    export interface Client {
        prefix?: string;
        git: GitHub
    }
}

class BotClient extends Client {
    constructor(public prefix?: string) {
        super({
            intents: [
                IntentsBitField.Flags.Guilds,
                IntentsBitField.Flags.GuildMembers,
                IntentsBitField.Flags.GuildPresences,
                IntentsBitField.Flags.GuildMessages,
                IntentsBitField.Flags.MessageContent,
            ],
            rest: {
                offset: 100,
            },
            makeCache: Options.cacheWithLimits({
                MessageManager: {
                    maxSize: 200,
                },
            }),
            presence: getPresence({
                status: process.env.STATUS as PresenceData["status"],
                name: process.env.ACTIVITY_NAME,
                type: process.env.ACTIVITY_TYPE as keyof typeof ActivityType,
                stream_url: process.env.STREAM_URL,
            }),
        });
        if (!process.env.GITHUB_TOKEN) {
            console.error(`You didn't fill out 'GITHUB_TOKEN' in the .env file.`);
            return process.exit(1);
        }
        this.git = new GitHub(process.env.GITHUB_TOKEN as string);
        if (!checkIfDeploy()) {
            loadEvents(this, getFilesList(events));
            this.login(process.env.TOKEN).catch(console.error);
        }
    }
}
export default new BotClient(process.env.PREFIX);
