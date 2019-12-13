#  S3 Image Resizing Migrating
#
#  Author:       Isom Durm (isom@phenomapp.com)
#
#
#  Description:  Utility used to create size varaiants for existing images in the system:
#                  -_thumb
#    			   -_tiny
#                  -_cropped
#
#  Usage:         python ./s3MakeImageVariants.py

#libs
#from pymongo import MongoClient
#from bson.objectid import ObjectId
from progressbar import ProgressBar, Percentage, ETA, Counter
from boto.s3.connection import S3Connection, Key
import re
import os
import PIL
from PIL import Image, ExifTags
import shutil

def resize(img, box, fit, out):
	'''Downsample the image.
	@param img: Image -  an Image-object
	@param box: tuple(x, y) - the bounding box of the result image
	@param fix: boolean - crop the image to fill the box
	@param out: file-like-object - save the image into the output stream
	'''

	for orientation in ExifTags.TAGS.keys() : 
            if ExifTags.TAGS[orientation]=='Orientation' : break 
        exif=dict(img._getexif().items())

        if   exif[orientation] == 3 : 
            img=img.rotate(180, expand=True)
        elif exif[orientation] == 6 : 
            img=img.rotate(270, expand=True)
        elif exif[orientation] == 8 : 
            img=img.rotate(90, expand=True)

	#preresize image with factor 2, 4, 8 and fast algorithm
	factor = 1
	while img.size[0]/factor > 2*box[0] and img.size[1]*2/factor > 2*box[1]:
		factor *=2
	if factor > 1:
		img.thumbnail((img.size[0]/factor, img.size[1]/factor), Image.NEAREST)

	#calculate the cropping box and get the cropped part
	if fit:
		x1 = y1 = 0
		x2, y2 = img.size
		wRatio = 1.0 * x2/box[0]
		hRatio = 1.0 * y2/box[1]
		if hRatio > wRatio:
			y1 = int(y2/2-box[1]*wRatio/2)
			y2 = int(y2/2+box[1]*wRatio/2)
		else:
			x1 = int(x2/2-box[0]*hRatio/2)
			x2 = int(x2/2+box[0]*hRatio/2)
		img = img.crop((x1,y1,x2,y2))

	#Resize the image with best quality algorithm ANTI-ALIAS
	img.thumbnail(box, Image.ANTIALIAS)

	#save it into a file-like object
	img.save(out, "JPEG", quality=100)

#connection info
#mongoConnectionStr = 'mongodb://phenomReadWrite:__N0d13h$__@ec2-54-84-227-113.compute-1.amazonaws.com:27017/phenom-data' #testDB
#mongoConnection = MongoClient(mongoConnectionStr)
s3Connection = S3Connection('AKIAI2IRGRNQ5WPGVMMA', 'RI94WbJD+u6vwqnMla45LKKZbd8OLy1oJPojOSGl')
bucket = s3Connection.get_bucket('phenomapp') # Substitute in your bucket name

print("Creating User Profile Image Variants...")
regex = "^profileImages/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$"
profileImages = bucket.list()
progressBar = ProgressBar(widgets=["Completed:  ", Counter()])
shutil.rmtree('./profileImages', 'f')
os.mkdir('./profileImages')
shutil.rmtree('./resizedProfileImages', 'f')
os.mkdir('./resizedProfileImages')
for key in progressBar(profileImages):
	match = re.match(regex, key.key)
	if(match):
		try:
			path = './profileImages/' + match.group(1) + '.jpg'
			key.get_contents_to_filename(path)
			resize(Image.open(path), (75,75), True, './resizedProfileImages/' + match.group(1) + '_tiny.jpg')
			keyNew = bucket.new_key(key.key + '_tiny')
			keyNew.set_contents_from_filename('./resizedProfileImages/' + match.group(1) + '_tiny.jpg')
			print(keyNew.key)
			resize(Image.open(path), (250,250), True, './resizedProfileImages/' + match.group(1) + '_thumb.jpg')
			keyNew = bucket.new_key(key.key + '_thumb')
			keyNew.set_contents_from_filename('./resizedProfileImages/' + match.group(1) + '_thumb.jpg')
			print(keyNew.key)
		except Exception as e:
			print e
progressBar.finish()

print("\nCreating Moment Image Variants...")
regex = "^momentImages/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$"
momentImages = bucket.list()
progressBar = ProgressBar(widgets=["Completed:  ", Counter()])
shutil.rmtree('./momentImages', 'f')
os.mkdir('./momentImages')
shutil.rmtree('./resizedMomentImages', 'f')
os.mkdir('./resizedMomentImages')
for key in progressBar(momentImages):
	match = re.match(regex, key.key)
	if(match):
		try:
			path = './momentImages/' + match.group(1) + '.jpg'
			key.get_contents_to_filename(path)
			resize(Image.open(path), (75,75), True, './resizedMomentImages/' + match.group(1) + '_tiny.jpg')
			keyNew = bucket.new_key(key.key + '_tiny')
			keyNew.set_contents_from_filename('./resizedMomentImages/' + match.group(1) + '_tiny.jpg')
			print(keyNew.key)
			resize(Image.open(path), (250,250), True, './resizedMomentImages/' + match.group(1) + '_thumb.jpg')
			keyNew = bucket.new_key(key.key + '_thumb')
			keyNew.set_contents_from_filename('./resizedMomentImages/' + match.group(1) + '_thumb.jpg')
			print(keyNew.key)
		except:
			i = 0



