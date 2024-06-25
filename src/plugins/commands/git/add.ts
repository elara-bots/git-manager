import { buildCommand, getStr, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is } from "@elara-services/utils";
import { SlashCommandBuilder } from "discord.js";

export const add = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`add`)
        .setDescription(`[DEVS]: Add a file to a github repo`)
        .addStringOption((o) => getStr(o, {
            name: "path",
            description: `The path to the file (ex: 'folder/boop.png', 'folder/folder_2/boop.txt')`,
            required: true,
        }))
        .addStringOption((o) => getStr(o, {
            name: `repo`,
            description: `The repo to use (ex: 'owner/repo', 'elara-bots/npm')`,
            required: is.string(process.env.GITHUB_REPO) ? false : true,
        }))
        .addStringOption((o) => getStr(o, {
            name: "url",
            description: `The url to get the data from`,
            required: false,
        }))
        .addAttachmentOption((o) => o.setName(`attachment`).setDescription(`The attachment to use for the file path`).setRequired(false))
        .addStringOption((o) => getStr(o, {
            name: "branch",
            description: `Which branch on the repo? (def: main)`,
            required: false
        })),
    defer: { silent: true },
    locked: { 
        users: process.env.AUTHORIZED?.split("|") || [], 
    },
    async execute(i, r) {
        if (!process.env.AUTHORIZED?.split("|").includes(i.user.id)) {
            return r.edit(embedComment(`You're not authorized to use this command.`));
        }
        const path = i.options.getString("path", true);
        const repo = i.options.getString("repo", false) || process.env.GITHUB_REPO;
        const url = i.options.getString("url", false);
        const attachment = i.options.getAttachment("attachment", false);
        const branch = i.options.getString("branch", false) || "main";
        if (!is.string(url) && !attachment) {
            return r.edit(embedComment(`You didn't provide a 'url' or 'attachment'`));
        }
        if (!is.string(repo)) {
            return r.edit(embedComment(`You didn't provide a valid repo`));
        }
        const [ owner, name ] = repo.split("/");
        if (!is.string(owner)) {
            return r.edit(embedComment(`Unable to find the owner of the repo in the text you provided.`));
        }
        if (!is.string(name)) {
            return r.edit(embedComment(`Unable to find the repo name in the text you provided.`));
        }

        if (is.string(url)) {
            if (!url.match(/https?:\/\//gi)) {
                return r.edit(embedComment(`You didn't provide a link for 'url'`));
            }
        }

        const base = url || attachment?.url;
        if (!base) {
            return r.edit(embedComment(`Unable to find any url or attachment.url`));
        }
        // @ts-ignore
        const rr = await i.client.git.files.create({
            repo: {
                owner,
                repo: name,
                branch,
            },
            path,
            url: base,
            message: `Uploaded by: ${i.user.tag} (${i.user.id})`,
            // @ts-ignore
        }).catch((e) => new Error(e));
        if (rr instanceof Error) {
            return r.edit(embedComment(rr.message));
        }
        return r.edit(embedComment(`File created: ${rr}`, "Green"));
    },
});
