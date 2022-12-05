FROM    nginxinc/nginx-unprivileged:1.23
COPY    ./dist /usr/share/nginx/html
