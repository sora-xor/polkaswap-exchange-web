FROM    nginxinc/nginx-unprivileged:1.25.4-alpine3.18-slim
COPY    ./dist /usr/share/nginx/html