import express from "express";
import createHttpError from "http-errors";
import productModel from "./model.js";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import q2m from "query-to-mongo";

const productsRouter = express.Router();
productsRouter.post("/", async (req, res, next) => {
  try {
    const newProduct = new productModel(req.body);
    const { _id } = await newProduct.save();
    res.status(201).send({ _id });
  } catch (error) {
    next(error);
  }
});
productsRouter.get("/", async (req, res, next) => {
  const mongoQuery = q2m(req.query);

  try {
    const products = await productModel
      .find(mongoQuery.criteria, mongoQuery.options.fields)
      .limit(mongoQuery.options.limit)
      .skip(mongoQuery.options.skip)
      .sort(mongoQuery.options.sort);
    const total = await productModel.countDocuments(mongoQuery.criteria);
    res.send({
      links: mongoQuery.links("http://localhost:3011/products", total),
      total,
      numberOfPages: Math.ceil(total / mongoQuery.options.limit),
      products,
    });
  } catch (error) {
    next(error);
  }
});

productsRouter.get("/:productId", async (req, res, next) => {
  try {
    const product = await productModel.findById(req.params.productId);
    if (product) {
      res.send(product);
    } else {
      next(
        createHttpError(
          404,
          `product with id ${req.params.productId} not found`
        )
      );
    }
  } catch (error) {
    next(error);
  }
});
productsRouter.delete("/:productId", async (req, res, next) => {
  try {
    const deletedProduct = await productModel.findByIdAndDelete(
      req.params.productId
    );
    if (deletedProduct) {
      res.status(204).send();
    } else {
      next(
        createHttpError(
          404,
          `product with id ${req.params.productId} not found`
        )
      );
    }
  } catch (error) {
    next(error);
  }
});
productsRouter.put("/:productId", async (req, res, next) => {
  try {
    const updatedProduct = await productModel.findByIdAndUpdate(
      req.params.productId,
      req.body,
      { new: true, runValidators: true }
    );
    if (updatedProduct) {
      res.send(updatedProduct);
    } else {
      next(
        createHttpError(404, `product with id ${req.params.product} not found`)
      );
    }
  } catch (error) {
    next(error);
  }
});
const cloudinaryUploader = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "products/imageURL",
    },
  }),
}).single("imageURL");

productsRouter.post(
  "/:productId/uploadImage",
  cloudinaryUploader,
  async (req, res, next) => {
    try {
      if (req.file) {
        const product = await productModel.findById(req.params.productId);
        if (product) {
          product.imageUrl = req.file.path;
          await product.save();
          res.send("uploaded");
        } else {
          next(
            createHttpError(
              404,
              `product with id ${req.params.product} not found`
            )
          );
        }
      } else {
        next(createHttpError(400, "upload an image"));
      }
    } catch (error) {
      next(error);
    }
  }
);

productsRouter.post("/:productId/reviews", async (req, res, next) => {
  try {
    const newReview = req.body;
    const updatedProduct = await productModel.findByIdAndUpdate(
      req.params.productId,
      { $push: { reviews: newReview } },
      { new: true, runValidators: true }
    );
    if (updatedProduct) {
      res.send(updatedProduct);
    } else {
      next(
        createHttpError(404, `product with id ${req.params.product} not found!`)
      );
    }
  } catch (error) {
    next(error);
  }
});

productsRouter.get("/:productId/reviews", async (req, res, next) => {
  try {
    const product = await productModel.findById(req.params.productId);
    if (product) {
      res.send(product.reviews);
    } else {
      next(
        createHttpError(
          404,
          `product with id ${req.params.productId} not found!`
        )
      );
    }
  } catch (error) {
    next(error);
  }
});
productsRouter.get("/:productId/reviews/:reviewId", async (req, res, next) => {
  try {
    const product = await productModel.findById(req.params.productId);
    if (product) {
      const review = product.reviews.find(
        (r) => r._id.toString() === req.params.reviewId
      );
      if (review) {
        res.send(review);
      } else {
        next(
          createHttpError(
            404,
            `review with id ${req.params.reviewId} not found!`
          )
        );
      }
    } else {
      next(
        createHttpError(
          404,
          `product with id ${req.params.productId} not found!`
        )
      );
    }
  } catch (error) {
    next(error);
  }
});
productsRouter.delete(
  "/:productId/reviews/:reviewId",
  async (req, res, next) => {
    try {
      const updatedProduct = await productModel.findByIdAndUpdate(
        req.params.productId,
        { $pull: { reviews: { _id: req.params.reviewId } } },
        { new: true, runValidators: true }
      );
      if (updatedProduct) {
        res.send({ deleted: "deleted", updatedProduct });
      } else {
        next(
          createHttpError(
            404,
            `items with id's  ${req.params.productId} or ${req.params.reviewId} not found`
          )
        );
      }
    } catch (error) {
      next(error);
    }
  }
);
productsRouter.put("/:productId/reviews/:reviewId", async (req, res, next) => {
  try {
    const product = await productModel.findById(req.params.productId);
    if (!product)
      return next(
        createHttpError(
          404,
          `product with id ${req.params.productId} not found!`
        )
      );

    const index = product.reviews.findIndex(
      (r) => r._id.toString() === req.params.reviewId
    );
    if (index !== -1) {
      product.reviews[index] = {
        ...product.reviews[index].toObject(),
        ...req.body,
      };
      await product.save();
      res.send(product);
    } else {
      next(
        createHttpError(404, `review with id ${req.params.reviewId} not found!`)
      );
    }
  } catch (error) {
    next(error);
  }
});

export default productsRouter;
