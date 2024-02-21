FROM    nginxinc/nginx-unprivileged:1.25-alpine3.17-slim
COPY    ./dist /usr/share/nginx/html
