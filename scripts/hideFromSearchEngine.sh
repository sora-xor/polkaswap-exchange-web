#!/bin/bash

sed -i 'i 28 <meta name="robots" content="noindex">' ../public/index.html
echo "index.html was modified!"
