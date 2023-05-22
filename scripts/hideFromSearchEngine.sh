#!/bin/bash

if [[ $ENV == "test"]]; then
sed -i 'i 28 <meta name="robots" content="noindex">' ../public/index.html
fi