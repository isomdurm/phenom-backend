#!/bin/bash
#
# phenom-backend Application Deployment Tool
#
# Description:   Deploys a phenomapp-backend branch HEAD commit to the phenom-app AWS EBS Application
# Author:       Isom Durm (isom@phenomapp.com)


function usage
{
    echo "usage: deployTOAWSEB [[ [ -r repo ] [-k keys-path] [-e environment-name ] [-s3 s3-bucket ]] | [-h help]]
             Example:  sh ./deployToAWSEB.sh -r ../ -e phenomapp-test-1-2-3 -s3 ebs-bundles -k ~/Documents/Projects/Phenom/Resources/keys/"
}

if [ "$#" -ne 8 ]; then
    usage
    exit
fi

while [ "$1" != "" ]; do
    case $1 in
    	-k | --keys-path )         shift
                                   KEYS_PATH=$1
                                   ;;
    	-r | --repo )              shift
                                   REPO_PATH=$1
                                   ;;
        -e | --environment-name )  shift
                                   ENV_NAME=$1
                                   ;;
        -s3 | --s3-bucket )        shift
                                   S3_BUCKET=$1
                                   ;;                           
        -h | --help )              usage
                                   exit
                                   ;;
        * )                        usage
                                   exit 1
    esac
    shift
done

#cd to the repo's dir
export CURRENT_DIR=`pwd`
cd ${REPO_PATH}

export APP_VERSION=`git rev-parse --short HEAD`
export BRANCH_NAME=`git rev-parse --abbrev-ref HEAD`
export BUNDLE_NAME=${BRANCH_NAME}-${APP_VERSION}
#sudo pip install awscli

# zip the application
git archive --format=zip HEAD > "${BUNDLE_NAME}.zip"

#bundle the keys with this archive
cp -R ${KEYS_PATH} keys
zip -r "${BUNDLE_NAME}.zip" keys
rm -rf keys

# delete any version with the same name (based on the short revision)
aws elasticbeanstalk delete-application-version --application-name phenom-backend --version-label "${BUNDLE_NAME}"  --delete-source-bundle

# upload to S3
aws s3 cp "${BUNDLE_NAME}.zip" s3://${S3_BUCKET}/${BUNDLE_NAME}.zip

# create a new version and update the environment to use this version
aws elasticbeanstalk create-application-version --application-name phenom-backend --version-label "${BUNDLE_NAME}" --source-bundle S3Bucket="${S3_BUCKET}",S3Key="${BUNDLE_NAME}.zip"
aws elasticbeanstalk update-environment --environment-name "${ENV_NAME}" --version-label "${BUNDLE_NAME}"

#kill the archive
rm "${BUNDLE_NAME}.zip" 

#restore the original directory
cd ${CURRENT_DIR}