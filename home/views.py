from django.http import JsonResponse
from django.views.decorators.http import require_GET
from .models import Product


def index(request):
    return JsonResponse({
        "message": "Welcome to CandyStore",
        "status": "success"
    })


def health(request):
    return JsonResponse({
        "status": "healthy"
    })


@require_GET
def products(request):
    product_list = Product.objects.filter(
        is_active=True
    ).values("id", "name", "description", "price")

    data = [
        {
            "id": item["id"],
            "name": item["name"],
            "description": item["description"],
            "price": float(item["price"]),
        }
        for item in product_list
    ]

    return JsonResponse({
        "status": "success",
        "count": len(data),
        "products": data,
    })
