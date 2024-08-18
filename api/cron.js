const { App } = require('@slack/bolt');
require('dotenv').config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const channelId = process.env.SLACK_CHANNEL_ID;
const CRON_REQ_SECRET = process.env.CRON_REQ_SECRET;

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
        return 'No active members found';
      }
  
      const memberMentions = activeMembers.map(userId => `<@${userId}>`).join(' ');
      const message = `👋 Hey ${memberMentions}! Just a friendly reminder to share your daily updates! Please take a moment to fill out the following:
  
  **Tasks done today:**
  -  
  -  
  -  
  
  **Tasks for tomorrow:**
  -  
  -  
  -  
  
  **Blockers:**
  -  
  -  
  -  
  
  This helps everyone stay in the loop and keeps us all moving forward. Thanks! 😊`;
  
      await app.client.chat.postMessage({
        channel: channelId,
        text: message,
      });
  
      console.log('Reminder sent');
      return 'Reminder sent successfully';
    } catch (error) {
      console.error('Error in sendReminder:', error);
      throw error;
    }
}

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      const { secret } = req.body;

      if (secret !== CRON_REQ_SECRET) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await sendReminder();
      res.status(200).json({ message: result });
    } catch (error) {
      console.error('Error in webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};
