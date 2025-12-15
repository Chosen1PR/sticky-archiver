import {
  reddit,
  settings,
} from "@devvit/web/server";

import { PostId } from "../shared/types";

// Helper function for locking post.
export async function lockPost(
  postId: PostId,
  flairText: string,
  postTitle: string
) {
  try {
    const shouldPostBeLocked = await isPostApplicable(flairText, postTitle);
    if (shouldPostBeLocked) {
      const post = await reddit.getPostById(postId);
      await post.lock();
    }
  } catch {}
}

// Helper function for unlocking post.
export async function unlockPost(
  postId: PostId,
  flairText: string,
  postTitle: string
) {
  try {
    const shouldPostBeUnlocked = await isPostApplicable(flairText, postTitle);
    if (shouldPostBeUnlocked) {
      const post = await reddit.getPostById(postId);
      await post.unlock();
    }
  } catch {}
}

// Helper function for checking post flair and title to see if it should be locked or unlocked.
async function isPostApplicable(flairText: string, postTitle: string) {
  // Get all settings
  const appSettings = await settings.getAll();
  // First check the "Turn on for all pinned posts" setting.
  var isPostApplicable = appSettings["for-all-pinned"] as boolean;
  // If setting is not enabled, check post flair.
  if (!isPostApplicable)
    isPostApplicable = isFlairInList(flairText, appSettings["archive-flair-list"] as string);
  // If post flair is not applicable, check title.
  if (!isPostApplicable)
    isPostApplicable = isTitleInList(postTitle, appSettings["archive-title-list"] as string);
  return isPostApplicable;
}

// Helper function for verifying if post flair includes a flair in the list in the config settings
function isFlairInList(flair: string | undefined, flairList: string) {
  // For invalid flair, return false.
  if (flair == undefined || flair == '') return false;
  // Get list from config settings.
  //const flairList = (await settings.get("archive-flair-list")) as string;
  if (flairList == undefined || flairList.trim() == "")
    return false; // If flair list is empty, return false.
  flair = flair.trim(); //trim unneeded white space
  var flairs = flairList.trim().split(","); //separate words in list
  for (let i = 0; i < flairs.length; i++) {
    flairs[i] = flairs[i]!.trim(); //for each flair in the list, trim white space as well
    if (flairs[i] == flair) //check if flair match
      return true;
  }
  //reached end of list, no match
  return false;
}

// Helper function for verifying if post title includes a title keyword in the list in the config settings
function isTitleInList(title: string | undefined, titleList: string) {
  // For invalid title, return false.
  if (title == undefined || title == '') return false;
  // Get list from config settings.
  //const titleList = (await settings.get("archive-title-list")) as string;
  if (titleList == undefined || titleList.trim() == "")
    return false; // If title list is empty, return false.
  title = title.trim(); //trim unneeded white space
  var titles = titleList.trim().split(","); //separate title keywords in list
  for (let i = 0; i < titles.length; i++) {
    titles[i] = titles[i]!.trim(); //for each title keywords in the list, trim white space as well
    if (title.includes(titles[i]!)) //check if titles match
      return true;
  }
  //reached end of list, no match
  return false;
}