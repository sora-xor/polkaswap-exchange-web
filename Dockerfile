FROM    nginxinc/nginx-unprivileged:1.23-alpine
COPY    ./nginx.conf /etc/nginx/conf.d/default.conf
COPY    ./dist /usr/share/nginx/html
