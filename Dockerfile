FROM    nginxinc/nginx-unprivileged:1.20
COPY    ./dist /usr/share/nginx/html
