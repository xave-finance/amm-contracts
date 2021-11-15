#!/bin/bash
rm -rf balancer-core-v2

echo "Downloading contracts..."
# link/clone and build contracts
if [ ! -z "$1" ] && [ $1="local" ]; then
    ln -sf ../../balancer-core-v2 .
else
    git clone https://github.com/balancer-labs/balancer-core-v2.git
    cd balancer-core-v2 \
    && git checkout decd8008d383f9e3400db3a336f376823d7fbab4 \
    && cd ..
fi

# prune old-contracts
rm -rf contracts/balancer-core-v2

echo "Copying latest contracts..."
mv balancer-core-v2/pkg contracts/balancer-core-v2

echo "Removing unused balancer code"
rm -rf balancer-core-v2

echo "Done!"
