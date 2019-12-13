import getopt
import sys
from boto.s3.connection import S3Connection
import codecs
from multiprocessing import Queue, Pool, Manager
from progressbar import ProgressBar, ETA, Percentage


def write_noncompleted(keys, completion_queue):
    keys_lookup = {}

    while not completion_queue.empty():
        keys_lookup[completion_queue.get()] = 1

    not_completed = []
    for key in keys:
        if key not in keys_lookup:
            not_completed.append(key)

    handle = codecs.open("Not_Completed.txt", mode="w", encoding="utf-8")
    handle.writelines(["{0}\n".format(key) for key in not_completed])
    handle.close()


def copy_key(key, completion_queue):
    try:
        s3_connection = S3Connection('AKIAI2IRGRNQ5WPGVMMA', 'RI94WbJD+u6vwqnMla45LKKZbd8OLy1oJPojOSGl')
        staging_bucket_name = "phenomapp-product"
        production_bucket_name = "phenomapp-product-prod"
        production_bucket = s3_connection.get_bucket(production_bucket_name, validate=False)
        production_bucket.copy_key("productImages/{0}".format(key), staging_bucket_name, key)
        completion_queue.put(key, block=True)

    except Exception as ex:
        print "\nError copying key ({0}):  {1}".format(key, ex)
        return None

    return key


def copy_keys_start(keys):
    print '\nIntegrating {0} Product Images:  '.format(len(keys))
    pbar = ProgressBar(widgets=[Percentage(), " - ", ETA()], maxval=len(keys)).start()
    worker_pool = Pool(processes=16)
    manager = Manager()
    queue = manager.Queue()
    # create a dictionary so we can quickly drain the completion_key if we need to bail
    keys_lookup = {}
    for key in keys:
        keys_lookup[key] = 1

    try:
        # submit the keys to the worker pool
        class Counter:
            count = 0

            def __init__(self):
                self.count = 0

            def inc(self):
                self.count += 1

        counter = Counter()

        def inc(result):
            if result is not None:
                counter.inc()
                pbar.update(counter.count)

        for key in keys:
            worker_pool.apply_async(func=copy_key, args=(key, queue), callback=inc)

        worker_pool.close()
        worker_pool.join()

        if pbar is not None:
            pbar.finish()

        write_noncompleted(keys, queue)
    except Exception as ex:
        #quickly drain the completion queue if we encounter an error so we can pick up where we left off
        write_noncompleted(keys, queue)
        print "Failed to copy:  {0}\n\nWriting keys not copied...".format(ex)


def run(input_name):
    try:
        print 'Opening:  {0}'.format(input_name)
        file_handle = codecs.open(input_name, mode='rw', encoding='utf-8')
        data = file_handle.read()
        file_handle.close()

        keys = [key.strip() for key in data.split('\n')]
        copy_keys_start(keys)

        print "\nComplete."

    except UnicodeEncodeError as err:
        sys.exit(err)


def main():
    input_name = ""

    try:
        opts, args = getopt.getopt(sys.argv[1:], "hf", ["file"])
    except getopt.GetoptError:
        print('productValidation.py -f [opt]')
        sys.exit(2)
    for opt, arg in opts:
        if opt == '-h':
            print('productValidation.py -h [opt]')
            sys.exit()
        elif opt in ("-f", "--file"):
            input_name = args[0]

    run(input_name)


if __name__ == "__main__":
    main()
