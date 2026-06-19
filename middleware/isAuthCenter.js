// Middleware to check if user is authenticated as exam center
const isAuthenticatedCenter = (req, res, next) => {
    if (req.session && req.session.centerId) {
        next();
    } else {
        res.status(403).json({ error: 'Not authenticated as exam center' });
    }
};

module.exports = isAuthenticatedCenter;
