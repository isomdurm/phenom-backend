#  Product Data Migration Util -
#       User.following -> Following, User.followersCount
#       ProductMetadata.lockerCount
#       Locker -> LockerItem
#       Moment.likes -> Like
#
#  Author:       Isom Durm (isom@phenomapp.com)
#
#
#  Description:  Utility used to migrate old users to use the new followersCount attribute, instead of calculating the 
#					count manually from the following collection.
#
#  Usage:         python ./addFansAndLockerCount.py

#libs
from pymongo import MongoClient
from datetime import datetime, timedelta
from progressbar import ProgressBar, Percentage, ETA, Counter
from bson.objectid import ObjectId

#connection info
mongo_connection_str = 'mongodb://phenomReadWrite:__N0d13h$__@ec2-54-174-159-246.compute-1.amazonaws.com:27017/phenom-data' #localhost
mongo_connection = MongoClient(mongo_connection_str)


def _split_user_following(user_model):
    index = 1
    for following in reversed(user_model['following']):
        mongo_connection['phenom-data'].following.insert({
            'sourceUser': ObjectId(user_model['_id']),
            'targetType': 0,
            'targetUser': ObjectId(following),
            'createdAt': datetime.utcnow() - timedelta(seconds=(10 * index)),
            'updatedAt': datetime.utcnow() - timedelta(seconds=(10 * index))
        })

        index += 1


print "Adding followersCount to each User object, splitting User.following into Following models"
users_to_process = mongo_connection['phenom-data'].user.find().count()
users_to_go = 0
progress_bar = ProgressBar(widgets=[Percentage(), ", Completed:  ", Counter(), " ", ETA()], maxval=users_to_process).start()

# Iterate over all the users
for user in mongo_connection['phenom-data'].user.find():

    # For each query, perform the query to get the user's followersCount ( the old gross nasty way )
    old_followers_count = mongo_connection['phenom-data'].user.find({
        'following': unicode(user['_id'])
    }).count()

    # re-write that number to the user.followersCount attribute
    user['followersCount'] = old_followers_count

    # save the user object
    mongo_connection['phenom-data'].user.save(user)

    # split following
    if 'following' in user and len(user['following']) > 0:
        _split_user_following(user)

    #update progress
    users_to_go += 1
    if users_to_go <= users_to_process:
        progress_bar.update(users_to_go)

if progress_bar is not None:
    progress_bar.finish()

print "Migrating Moment.likes array to Like Models"

moments_to_go = 0
moments_to_process = mongo_connection['phenom-data'].moment.count()
progress_bar = ProgressBar(widgets=[Percentage(), ", Completed:  ", Counter(), " ", ETA()], maxval=moments_to_process).start()
for moment in mongo_connection['phenom-data'].moment.find():

    if 'likes' in moment.keys():
        index = 1
        for like in reversed(moment['likes']):

            # For each moment, we need to create Like models for any likes
            mongo_connection['phenom-data'].like.insert({
                'sourceUser': ObjectId(like),
                'targetType': 0,
                'targetMoment': ObjectId(moment['_id']),
                'createdAt': datetime.utcnow() - timedelta(seconds=(10 * index)),
                'updatedAt': datetime.utcnow() - timedelta(seconds=(10 * index))
            })

            index += 1

        #likes.count -> likesCount (performance enhancement for Discover routes)
        moment['likesCount'] = len(moment['likes'])
        mongo_connection['phenom-data'].moment.save(moment)
    moments_to_go += 1
    if moments_to_go <= moments_to_process:
        progress_bar.update(moments_to_go)
if progress_bar is not None:
    progress_bar.finish()

product_counts = {}

print "Migrating Locker.products to LockerItem"
lockers_to_process = mongo_connection['phenom-data'].locker.find().count()
lockers_to_go = 0
progress_bar = ProgressBar(widgets=[Percentage(), ", Completed:  ", Counter(), " ", ETA()], maxval=lockers_to_process).start()

for locker in mongo_connection['phenom-data'].locker.find():
    index = 1

    for product in reversed(locker['products']):

        #store this count for the lockerCount ProductMetadata migration
        product_counts[product] = product_counts[product] + 1 if product in product_counts.keys() else 1

        #split the products array into LockerItems
        mongo_connection['phenom-data'].lockeritem.insert({
            'sourceUser': ObjectId(locker['userId']),
            'entryType':  0,
            'targetProduct': product,
            'createdAt': datetime.utcnow() - timedelta(seconds=(10 * index)),
            'updatedAt': datetime.utcnow() - timedelta(seconds=(10 * index))
        })

        index += 1

    lockers_to_go += 1
    if lockers_to_go <= lockers_to_process:
        progress_bar.update(lockers_to_go)

if progress_bar is not None:
    progress_bar.finish()

print "Migrating Locker Size to ProductMetadata.lockerCount"
products_to_process = mongo_connection['phenom-data'].product.find().count()
products_to_go = 0
progress_bar = ProgressBar(widgets=[Percentage(), ", Completed:  ", Counter(), " ", ETA()], maxval=products_to_process).start()

for product in mongo_connection['phenom-data'].product.find():
    product_metadata = mongo_connection['phenom-data'].productmetadata.find({'product: ': str(product['_id'])})
    
    assert(product_metadata.count() == 0)

    lockerCount = product_counts[int(product['itemId'])] if (int(product['itemId']) in product_counts.keys()) else 0
    mongo_connection['phenom-data'].productmetadata.insert({
        'product': product['itemId'],
        'lockerCount': int(lockerCount),
        'momentCount': int(product['globalMomentCount']),
        'stylingMomentCount': 0,
        'trainingMomentCount': 0,
        'gamingMomentCount':  0
    })

    products_to_go += 1
    if products_to_go <= products_to_process:
        progress_bar.update(products_to_go)

if progress_bar is not None:
   progress_bar.finish()   

#
#    The following is no longer necessary, we're directly translating momentCount from legacy product's globalMomentCount
#

#print 'Migrating Moment.productIds -> ProductMetadata.momentCount++'
#moments_to_process = mongo_connection['phenom-data'].moment.find().count()
#moments_to_go = 0
#progress_bar = ProgressBar(widgets=[Percentage(), ", Completed:  ", Counter(), " ", ETA()], maxval=moments_to_process).start()
#
#for moment in mongo_connection['phenom-data'].moment.find():
#    for productId in moment['productIds']:
#        product_metadata = mongo_connection['phenom-data'].productmetadata.find({'product: ': int(productId)})
#
#        if product_metadata.count() > 0:
#            assert len(product_metadata) == 1
#
#            product_metadata[0]['momentCount'] = product_metadata[0]['momentCount'] + 1
#            mongo_connection['phenom-data'].productmetadata.save(product_metadata[0])
#
#    moments_to_go += 1
#    if moments_to_go <= moments_to_process:
#        progress_bar.update(moments_to_go)
#
#if progress_bar is not None:
#    progress_bar.finish()

mongo_connection.close()
