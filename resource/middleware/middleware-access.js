const HasAccess = (path, action) => {
  return async (req, res, next) => {
    try {
      // Pastikan data login tersedia
      const ACCESS = req.login?.has_access;

      if (!ACCESS) {
        return res
          .status(401)
          .json({ message: "Unauthorized: No access data found" });
      }

      // Cari path yang sesuai
      const accessItem = ACCESS.find((item) => item.path === path);

      // Cek apakah path ada DAN action-nya bernilai true
      // Kita gunakan [action] untuk mengakses key di dalam object/map
      if (
        accessItem &&
        accessItem.actions &&
        accessItem.actions[action] === true
      ) {
        return next();
      }

      // Jika tidak ditemukan atau action false
      return res.status(403).json({
        message: `Forbidden: You do not have access permission for this path`,
      });
    } catch (err) {
      next(err);
    }
  };
};

module.exports = HasAccess;

// Cara Penggunaan di Route:
// router.get("/module", HasAccess("/security/module", "view"), ModuleController.getAll);
