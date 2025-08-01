#!/bin/bash
cd /opt/logroxapp || exit 1
git pull origin main && sudo systemctl restart logrox
