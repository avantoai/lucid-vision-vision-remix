const { Octokit } = require('@octokit/rest');

let connectionSettings;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

async function createRepository() {
  const octokit = await getGitHubClient();
  
  try {
    const { data } = await octokit.repos.createForAuthenticatedUser({
      name: 'lucid-vision-vision-remix',
      description: 'AI-powered meditation app - Vision Remix',
      private: false,
      auto_init: false
    });
    
    console.log('✅ Repository created successfully!');
    console.log(`Repository URL: ${data.html_url}`);
    console.log(`Clone URL: ${data.clone_url}`);
    console.log(`SSH URL: ${data.ssh_url}`);
    
    return data;
  } catch (error) {
    if (error.status === 422) {
      console.log('⚠️  Repository already exists. Fetching details...');
      const user = await octokit.users.getAuthenticated();
      const { data } = await octokit.repos.get({
        owner: user.data.login,
        repo: 'lucid-vision-vision-remix'
      });
      console.log(`Repository URL: ${data.html_url}`);
      console.log(`Clone URL: ${data.clone_url}`);
      console.log(`SSH URL: ${data.ssh_url}`);
      return data;
    }
    throw error;
  }
}

createRepository().catch(console.error);
