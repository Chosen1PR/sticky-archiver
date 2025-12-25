import express from "express";
import {
  createServer,
  context,
  getServerPort,
  settings,
} from "@devvit/web/server";

import { PostId } from "../shared/types";

import { lockPost, unlockPost } from "./utils"

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

// Trigger handler for mod action, specifically unsticky and sticky
router.post('/internal/triggers/on-mod-action', async (req, res): Promise<void> => {
  // Get full mod action.
  //console.log(`Full Mod Action: ${JSON.stringify(req.body, null, 2)}`);
  try {
    const type = req.body.type as string;
    if (type != undefined && type === "ModAction") {
      const action = req.body.action as string;
      if (action != undefined && action === "unsticky") {
        //console.log(`Unsticky Mod Action: ${JSON.stringify(req.body, null, 2)}`);
        const commentId = req.body.targetComment.id as string;
        if (commentId != undefined && commentId != "") return; // If action is on a comment, do nothing.
        const enableArchive = (await settings.get("enable-archive")) as boolean;
        if (!enableArchive) return; // If the setting is not enabled, do nothing.
        const isPostLocked = req.body.targetPost.isLocked as boolean;
        if (!isPostLocked)
          await lockPost(
            req.body.targetPost.id as PostId,
            req.body.targetPost.linkFlair.text as string,
            req.body.targetPost.title as string
          );
      }
      else if (action != undefined && action === "sticky") {
        //console.log(`Sticky Mod Action: ${JSON.stringify(req.body, null, 2)}`);
        const commentId = req.body.targetComment.id as string;
        if (commentId != undefined && commentId != "") return; // If action is on a comment, do nothing.
        const enableUnlock = (await settings.get("enable-unlock")) as boolean;
        if (!enableUnlock) return; // If the setting is not enabled, do nothing.
        const isPostLocked = req.body.targetPost.isLocked as boolean;
        if (isPostLocked)
          await unlockPost(
            req.body.targetPost.id as PostId,
            req.body.targetPost.linkFlair.text as string,
            req.body.targetPost.title as string
          );
      }
    }
    res.status(200).json({ status: 'ok' });
  }
  catch (error) { console.log(`General error: ${error}`); } // General catch to make sure app doesn't throw an exception.
});

app.use(router);

const server = createServer(app);
server.on("error", (err) => console.error(`server error: ${err.stack}`));
server.listen(getServerPort());