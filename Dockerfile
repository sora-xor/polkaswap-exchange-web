FROM    nginxinc/nginx-unprivileged:1.24.0-alpine-slim
COPY    ./dist /usr/share/nginx/html
