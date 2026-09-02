from rest_framework import permissions

class IsAdminUserRole(permissions.BasePermission):
    """
    Allows access only to Admin/Owner users.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and 
            (request.user.role == 'OWNER' or request.user.is_superuser or request.user.is_staff)
        )


class IsReceptionistOrAdmin(permissions.BasePermission):
    """
    Allows access to Admin/Owner and Receptionist/Manager users.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and 
            (request.user.role in ['OWNER', 'MANAGER'] or request.user.is_superuser)
        )


class IsStaffUser(permissions.BasePermission):
    """
    Allows access to all gym staff (Owner, Manager, Trainer).
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Admin can edit, other authenticated staff can read.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role == 'OWNER' or request.user.is_superuser
