const { App } = require('@slack/bolt');
require('dotenv').config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const channelId = process.env.SLACK_CHANNEL_ID;

async function getActiveChannelMembers() {
  try {
    const result = await app.client.conversations.members({
      channel: channelId
    });

    const memberPromises = result.members.map(async (memberId) => {
      const userInfo = await app.client.users.info({ user: memberId });
      return userInfo.user.deleted || userInfo.user.is_bot ? null : memberId;
    });

    const members = await Promise.all(memberPromises);
    return members.filter(member => member !== null);
  } catch (error) {
    console.error('Error fetching channel members:', error);
    return [];
  }
}

async function sendReminder() {
  try {
    const activeMembers = await getActiveChannelMembers();
    
    if (activeMembers.length === 0) {
      console.log('No active members found in the channel.');
      return;
    }

    const memberMentions = activeMembers.map(userId => `<@${userId}>`).join(' ');
    const message = `Hey ${memberMentions}! Time for your daily update. Please post your progress in the channel.`;

    await app.client.chat.postMessage({
      channel: channelId,
      text: message,
    });

    console.log(`Reminder sent`);
  } catch (error) {
    console.error('Error in sendReminder:', error);
  }
}

module.exports = async (req, res) => {
  try {
    await sendReminder();
    res.status(200).send('Reminder sent successfully');
  } catch (error) {
    console.error('Error in cron job:', error);
    res.status(500).send('Error sending reminder');
  }
};
