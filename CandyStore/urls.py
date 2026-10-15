from django.contrib import admin
from django.urls import path
from home.views import index, health, products

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", index, name="home"),
    path("health/", health, name="health"),
    path("api/products/", products, name="products"),
]
