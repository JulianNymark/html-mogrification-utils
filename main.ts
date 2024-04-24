#!/usr/bin/env deno run --allow-read --allow-write

// get DRYRUN from envs
const DRYRUN = Deno.env.get("DRYRUN") === "true";

const prefix = Deno.args[0] || "";
console.log({ prefix });

const files = await Deno.readDir(Deno.cwd());

const filesArray = await Array.fromAsync(files);

const htmlFiles = filesArray.filter((file) => file.name.endsWith(".html"));

type Replacement = {
  filepath: string;
  start_idx: number;
  length: number;
  original: string;
  replacement: string;
};

const replacements: Replacement[] = [];

const remove_quotes = (str: string) => {
  return str.replace(/"/g, "");
};

htmlFiles.forEach((file) => {
  console.log(`###################`);
  console.log(`### ${file.name}`);
  console.log(`###################`);
  const content = Deno.readTextFileSync(file.name);

  const regex = /href=(.+?)[>\s]/g;
  const matches = content.matchAll(regex);

  Array.from(matches).forEach((match) => {
    if (match.length !== 2) {
      return;
    }
    const to_replace = `href=${match[1].trim()}`;
    const start_idx = match.index;

    const trimmed_match = match[1].trim();
    const last_path = trimmed_match.split("/").pop();
    if (trimmed_match.includes(":") || (last_path && last_path.includes("."))) {
      return;
    }

    const replacement = `href="${prefix}${remove_quotes(
      match[1].trim()
    )}.html"`;

    replacements.push({
      filepath: file.name,
      start_idx,
      length: to_replace.length,
      original: to_replace,
      replacement,
    });
  });
});

console.log({ replacements });
if (DRYRUN) {
  console.log("DRYRUN: exiting without writing files");
  Deno.exit(0);
}

// going in reverse to avoid changing the indexes while replacing
replacements.reverse().forEach((replacement) => {
  const content = Deno.readTextFileSync(replacement.filepath);
  const new_content =
    content.slice(0, replacement.start_idx) +
    replacement.replacement +
    content.slice(replacement.start_idx + replacement.length);
  Deno.writeTextFileSync(replacement.filepath, new_content);
});

console.log("done");
