
require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Events,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check if Airbound Moderation is online."),

  new SlashCommandBuilder()
    .setName("about")
    .setDescription("Learn about Airbound Moderation.")
].map(command => command.toJSON());

async function main() {
  const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

  if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
    throw new Error(
      "Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID environment variable."
    );
  }

  const rest = new REST({ version: "10" })
    .setToken(DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  await client.login(DISCORD_TOKEN);
}

client.once(Events.ClientReady, readyClient => {
  console.log(`${readyClient.user.tag} is online!`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    await interaction.reply("Pong! Airbound Moderation is online.");
  }

  if (interaction.commandName === "about") {
    await interaction.reply(
      "Airbound Moderation — the official community bot for Airbound."
    );
  }
});

main().catch(error => {
  console.error("Failed to start Airbound Moderation:", error);
  process.exitCode = 1;
});

