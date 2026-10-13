-- Photos uploaded by administrators for merch products, kept on the storage volume.
ALTER TABLE "MerchProduct" ADD COLUMN "imageStorageKey" TEXT;
