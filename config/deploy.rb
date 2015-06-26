require_relative 'aws_creds'

# Set the location of your SSH key.  You can give a list of files, but
# the first key given will be the one used to upload your chef files to
# each server.
set :ssh_options, {
  :user => 'deploy', # overrides user setting above
  :forward_agent => true,
  :auth_methods => %w(publickey)
}

# Set the location of your cookbooks/data bags/roles for Chef
set :chef_cookbooks_path, 'kitchen/cookbooks'
set :chef_data_bags_path, 'kitchen/data_bags'
set :chef_roles_path, 'kitchen/roles'

set :application, 'worker'
set :repo_url, 'git@github.com:krahimian/news.git'

set :deploy_to, '/home/deploy/worker'
set :pty, false

set :default_env, { 'NODE_ENV' => 'production' }
set :keep_releases, 2

set :use_sudo, true

namespace :forever do
  desc 'Install forever globally'
  task :setup do
    on roles(:worker), in: :parallel do
      execute "sudo npm install -g forever"
    end
  end

  desc 'Stop node script'
  task :stop do
    on roles(:worker), in: :parallel do
      execute "sudo forever stopall --killSignal=SIGTERM; true"
    end
  end

  task :start do
    on roles(:worker), in: :parallel do |host|
      execute "sudo NODE_ENV=production forever start -s #{release_path}/app.js"
    end
  end

  task :cleanlogs do
    on roles(:worker), in: :parallel do
      execute "sudo forever cleanlogs"
    end
  end
end

namespace :npm do
  task :symlink do
    on roles(:worker), in: :parallel do
      execute "rm -rf #{release_path}/node_modules && ln -s #{shared_path}/node_modules/ #{release_path}/node_modules"
    end
  end

  task :install do
    on roles(:worker), in: :parallel do
      execute "cd #{release_path}/ && sudo npm install --production --loglevel silent --unsafe-perm"
    end
  end
end

namespace :deploy do
  after :updated, 'npm:symlink'
  after :updated, 'npm:install'

  desc 'Restart node script'
  after :publishing, :restart do
    invoke 'forever:stop'
    invoke 'forever:clean_logs'
    invoke 'forever:cleanlogs'
    sleep 3
    invoke 'forever:start'
  end
end
