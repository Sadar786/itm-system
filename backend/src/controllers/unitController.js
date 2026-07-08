import Unit from "../models/Unit.js";

/**
 * =========================
 * CREATE UNIT
 * =========================
 */
export const createUnit = async (req, res) => {
  try {
    const {
      name,
      shortName,
      baseUnitId,
      factor = 1,
      isDecimalAllowed = true,
      isActive = true,
    } = req.body;

    if (!name || !shortName) {
      return res.status(400).json({
        success: false,
        message: "Name and Short Name are required",
      });
    }

    const existing = await Unit.findOne({
      $or: [
        { name: name.trim() },
        { shortName: shortName.trim().toUpperCase() },
      ],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Unit already exists",
      });
    }

    const unit = await Unit.create({
      name: name.trim(),
      shortName: shortName.trim().toUpperCase(),
      baseUnitId: baseUnitId || null,
      factor,
      isDecimalAllowed,
      isActive,
    });

    return res.status(201).json({
      success: true,
      message: "Unit created successfully",
      data: unit,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * =========================
 * GET ONE UNIT
 * =========================
 */
export const getOneUnit = async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id)
      .populate("baseUnitId", "name shortName");

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: unit,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * =========================
 * GET ALL UNITS
 * =========================
 */
export const getUnits = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = "",
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          shortName: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    const units = await Unit.find(query)
      .populate("baseUnitId", "name shortName")
      .sort({ name: 1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Unit.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: units,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * =========================
 * UPDATE UNIT
 * =========================
 */
export const updateUnit = async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await Unit.findById(id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    if (req.body.name || req.body.shortName) {
      const existing = await Unit.findOne({
        _id: { $ne: id },
        $or: [
          req.body.name
            ? { name: req.body.name.trim() }
            : null,
          req.body.shortName
            ? { shortName: req.body.shortName.trim().toUpperCase() }
            : null,
        ].filter(Boolean),
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Unit already exists",
        });
      }
    }

    if (req.body.shortName) {
      req.body.shortName = req.body.shortName
        .trim()
        .toUpperCase();
    }

    const updated = await Unit.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).populate("baseUnitId", "name shortName");

    return res.status(200).json({
      success: true,
      message: "Unit updated successfully",
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * =========================
 * DELETE UNIT
 * =========================
 */
export const deleteUnit = async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found",
      });
    }

    await Unit.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Unit deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};