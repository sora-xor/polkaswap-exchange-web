FROM    nginxinc/nginx-unprivileged:1.25-alpine-slim
COPY    ./dist /usr/share/nginx/html
