#!/bin/bash

export GITHUB_URL=$GITHUB_URL

echo -e "Cloning from GitHub URL: $GITHUB_URL"

git clone $GITHUB_URL /home/app/output

if [ $? -eq 0 ]; then
	echo -e "Cloning completed successfully."
	sleep 0.1
	echo -e "   \n"
	sleep 0
else
	echo -e "Cloning failed."
	sleep 0.1
	echo -e "   \n"
	exit 1
fi

cd /home/app/output

echo -e "Installing npm dependencies..."
npm install

if [ $? -eq 0 ]; then
	echo -e "npm install completed successfully."
	sleep 0.1
	echo -e "   \n"
	sleep 0
else
	echo -e "npm install failed."	
	sleep 0.1
	echo -e "   \n"
	exit 1
fi

echo -e "Building the project..."
npm run build

if [ $? -eq 0 ]; then
	echo -e "Build completed successfully."
else
	echo -e "Build failed."
	sleep 0.1
	echo -e "   \n"
	exit 1
fi

exit 0
