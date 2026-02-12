FROM centos:8
LABEL maintainer="a.scherbatyuk@gmail.com"

# Add ARGs and ENV here
ARG MONGODB_URI
ARG MONGODB_DB
ARG APP_PORT
ARG REDIS_URL
ARG WEBSOCKET_URL
ARG SPELL_CAST_TIMEOUT
ARG MINA_NETWORK_URL
ARG MINA_ADMIN_PRIVATE_KEY
ARG MINA_CONTRACT_ADDRESS
ARG BULLMQ_REDIS_HOST
ARG BULLMQ_REDIS_PORT

WORKDIR /usr/share/nestjs/main
COPY . .

RUN <<EOF
sed -i 's/mirrorlist/#mirrorlist/g' /etc/yum.repos.d/CentOS-*
sed -i 's|#baseurl=http://mirror.centos.org|baseurl=http://vault.centos.org|g' /etc/yum.repos.d/CentOS-*
yum update -y
curl -fsSL https://rpm.nodesource.com/setup_23.x | bash -
yum install -y nodejs
yum install -y gcc-c++ make
yum install -y cronie && yum clean all
yum install -y nano
yum install -y nc
mkdir -p /usr/share/nestjs/main
npm install pm2@latest -g
npm install -g pnpm
pm2 install pm2-logrotate
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:workerInterval 1800

# Create startup script for PM2
cat > /usr/local/bin/start-pm2.sh << 'EOL'
#!/bin/bash
# Start PM2 daemon
pm2 resurrect
# Keep container running
tail -f /dev/null
EOL

chmod +x /usr/local/bin/start-pm2.sh

mkdir -p /usr/share/temp/log
mkdir -p /usr/share/temp/tmp
mkdir -p /usr/share/temp/public
chmod 775 -R /usr/share/temp/
cd /usr/share/nestjs/main
pnpm install
echo "MONGODB_URI=${MONGODB_URI}" >> /usr/share/nestjs/main/.env
echo "MONGODB_DB=${MONGODB_DB}" >> /usr/share/nestjs/main/.env
echo "APP_PORT=${APP_PORT}" >> /usr/share/nestjs/main/.env
echo "REDIS_URL=${REDIS_URL}" >> /usr/share/nestjs/main/.env
echo "WEBSOCKET_URL=${WEBSOCKET_URL}" >> /usr/share/nestjs/main/.env
echo "SPELL_CAST_TIMEOUT=${SPELL_CAST_TIMEOUT}" >> /usr/share/nestjs/main/.env
echo "MINA_NETWORK_URL=${MINA_NETWORK_URL}" >> /usr/share/nestjs/main/.env
echo "MINA_ADMIN_PRIVATE_KEY=${MINA_ADMIN_PRIVATE_KEY}" >> /usr/share/nestjs/main/.env
echo "MINA_CONTRACT_ADDRESS=${MINA_CONTRACT_ADDRESS}" >> /usr/share/nestjs/main/.env
echo "BULLMQ_REDIS_HOST=${BULLMQ_REDIS_HOST}" >> /usr/share/nestjs/main/.env
echo "BULLMQ_REDIS_PORT=${BULLMQ_REDIS_PORT}" >> /usr/share/nestjs/main/.env
cp /usr/share/nestjs/main/.env /usr/share/nestjs/main/apps/backend/.env
cp /usr/share/nestjs/main/.env /usr/share/nestjs/main/apps/frontend/.env
pnpm turbo run build

# Enable PM2 monitoring
pm2 install pm2-server-monit
pm2 set pm2-server-monit:threshold 80

# Start the application with PM2 and wait for it to initialize
#pm2 start apps/backend/dist/backend/src/main.js --name nestjs-app --instances max --max-memory-restart 1G --env production --log /usr/share/temp/log/nestjs-app.log
pm2 start apps/backend/dist/backend/src/main.js --name nestjs-app --instances 1 --max-memory-restart 1G --env production
# Add a small delay to ensure PM2 is ready
sleep 5
# Save the PM2 configuration    
pm2 save
EOF
VOLUME ["/temp"]
CMD ["/usr/local/bin/start-pm2.sh"]
