FROM    nginxinc/nginx-unprivileged:1.23-alpine
COPY    ./dist /usr/share/nginx/html
