import express from "express";
import {
  createServer,
  context,
  getServerPort,
  reddit,
  settings,
} from "@devvit/web/server";

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

// Menu item for app settings
router.post("/internal/menu/app-settings", async (_req, res): Promise<void> => {
  res.json({
    navigateTo: `https://developers.reddit.com/r/${context.subredditName}/apps/${context.appName}`,
  });
});

// Trigger handler for mod action, specifically unban
router.post('/internal/triggers/on-mod-action', async (req, res): Promise<void> => {
  // Get full mod action.
  //console.log(req.body.toString());
  try {
    const type = req.body.type as string;
    if (type != undefined && type === "ModAction") {
      const action = req.body.action as string;
      if (action != undefined && action === "unbanuser") {
        // If we're here, this is an unban action.
        const username = req.body.targetUser.name as string;
        const modUsername = req.body.moderator.name as string;
        //console.log(`Username from request: ${username}`);
        //console.log(`Mod username from request: ${modUsername}`);
        // If we're ignoring unban actions from this particular mod, do nothing.
        if (await modIsIgnored(modUsername)) return;
        // Else, send the message.
        await sendMessageToUser(username);
      }
    }
    res.status(200).json({ status: 'ok' });
  }
  catch {} // General catch to make sure app doesn't throw an exception.
});

// Helper function to send a message to a user
async function sendMessageToUser(username: string) {
  var messageText = (await settings.get("message-text")) as string ?? '';
  if (messageText === '')
    return; // If there is no message text, do nothing
  const subredditName = context.subredditName as string;
  const sendAsSubreddit = await settings.get("send-as-subreddit") as boolean;
  const subjectText = `You have been unbanned from r/${subredditName}`;
  try {
    if (sendAsSubreddit) { // Send as modmail.
      const newConvo = await reddit.modMail.createConversation({
        subject: subjectText,
        body: messageText,
        to: username,
        isAuthorHidden: true,
        subredditName: subredditName,
      });
      // Archive the modmail conversation after sending.
      try { await reddit.modMail.archiveConversation(newConvo.conversation.id!) }
      catch {} // Catch needed in case for some reason message is sent to mod, as mod discussions can't be archived.
    }
    else { // Send as bot account.
      messageText += `\n\n---\n\n*This inbox is not monitored. If you have any questions, please message the moderators of r/${subredditName}.*`;
      await reddit.sendPrivateMessage({
        subject: subjectText,
        text: messageText,
        to: username,
      });
    }
  }
  catch (error) { // Log specific error messages
    if (error == "NOT_WHITELISTED_BY_USER_MESSAGE")
      console.log(`Error: Message not sent. u/${username} likely has chat/messaging disabled or has blocked the u/unban-message bot account.`);
    else console.log(`Error: Message not sent to u/${username}.`);
  }
}

// Helper function to find out if a specific mod's action is ignored
async function modIsIgnored(username: string) {
  // If whitelist is not empty, use that.
  const modWhitelist = await settings.get("mod-whitelist") as string;
  if (modWhitelist != undefined && modWhitelist.trim() != '')
    return !modIsInList(username, modWhitelist.trim());
  // Whitelist is empty. Check blacklist.
  const modBlacklist = await settings.get("mod-whitelist") as string;
  if (modBlacklist != undefined && modBlacklist.trim() != '')
    return modIsInList(username, modBlacklist.trim());
  // If both whitelist and blacklist are empty, mod is not ignored. Return false.
  return false;
}

// Helper function to find out if a mod's username is in the whitelist or blacklist
function modIsInList(username: string, modList: string) {
  const modUsernames = modList.split(',');
  for (let i = 0; i < modUsernames.length; i++) {
    if (username == modUsernames[i]) return true;
  }
  return false;
}

app.use(router);

const server = createServer(app);
server.on("error", (err) => console.error(`server error: ${err.stack}`));
server.listen(getServerPort());