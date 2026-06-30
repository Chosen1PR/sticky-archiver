import express from "express";
import {
  createServer,
  //context,
  getServerPort,
  settings,
} from "@devvit/web/server";

import { PostId } from "../shared/types";

import {
  lockPost,
  unlockPost,
  getRequestBodyValue,
  getRequestBodyValueAsBoolean
} from "./utils"

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

// Menu item for app settings
// Likely not necessary
/*
router.post("/internal/menu/app-settings", async (_req, res): Promise<void> => {
  res.json({
    navigateTo: `https://developers.reddit.com/r/${context.subredditName}/apps/${context.appSlug}`,
  });
});
*/

// Trigger handler for mod action, specifically unsticky and sticky
router.post('/internal/triggers/on-mod-action', async (req, res): Promise<void> => {
  const action = getRequestBodyValue(req.body, ['action']) ?? '',
  commentId = getRequestBodyValue(req.body, ['targetComment', 'id']) ?? '',
  postId = getRequestBodyValue(req.body, ['targetPost', 'id']) ?? '',
  flairText = getRequestBodyValue(req.body, ['targetPost', 'linkFlair', 'text']) ?? '',
  postTitle = getRequestBodyValue(req.body, ['targetPost', 'title']) ?? '',
  isPostLocked = getRequestBodyValueAsBoolean(req.body, ['targetPost', 'isLocked']) ?? false;
  //console.log(`postId: ${postId}\ncommentId: ${commentId}`);
  if (postId == '' || commentId != '') return;
  try {
    if (action == "unsticky") {
      //console.log(`Unsticky Mod Action: ${JSON.stringify(req.body, null, 2)}`);
      const enableArchive = (await settings.get("enable-archive")) as boolean;
      if (!enableArchive) return; // If the setting is not enabled, do nothing.
      if (!isPostLocked)
        await lockPost(
          postId as PostId,
          flairText,
          postTitle
        );
    }
    else if (action == "sticky") {
      //console.log(`Sticky Mod Action: ${JSON.stringify(req.body, null, 2)}`);
      const enableUnlock = (await settings.get("enable-unlock")) as boolean;
      if (!enableUnlock) return; // If the setting is not enabled, do nothing.
      const isPostLocked = req.body.targetPost.isLocked as boolean;
      if (isPostLocked)
        await unlockPost(
          postId as PostId,
          flairText,
          postTitle
        );
    }
    res.status(200).json({ status: 'ok' });
  }
  catch (error) { console.log(`General error: ${error}`); } // General catch to make sure app doesn't throw an exception.
});

app.use(router);

const server = createServer(app);
server.on("error", (err) => console.error(`server error: ${err.stack}`));
server.listen(getServerPort());