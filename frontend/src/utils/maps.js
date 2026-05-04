export function hasShippingCoordinates(orderOrLocation) {
  return getShippingCoordinates(orderOrLocation) !== null;
}

export function getShippingCoordinates(orderOrLocation) {
  const latitude = orderOrLocation?.shipping_latitude ?? orderOrLocation?.latitude;
  const longitude = orderOrLocation?.shipping_longitude ?? orderOrLocation?.longitude;

  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return null;
  }

  const parsedLatitude = Number(latitude);
  const parsedLongitude = Number(longitude);

  if (Number.isNaN(parsedLatitude) || Number.isNaN(parsedLongitude)) {
    return null;
  }

  return {
    latitude: parsedLatitude,
    longitude: parsedLongitude,
  };
}

export function getGoogleMapsUrl(orderOrLocation) {
  const coordinates = getShippingCoordinates(orderOrLocation);

  if (!coordinates) {
    return "";
  }

  return `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`;
}

export function getGoogleMapsEmbedUrl(orderOrLocation) {
  const coordinates = getShippingCoordinates(orderOrLocation);

  if (!coordinates) {
    return "";
  }

  return `https://maps.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}&z=17&output=embed`;
}

export function formatCoordinates(orderOrLocation) {
  const coordinates = getShippingCoordinates(orderOrLocation);

  if (!coordinates) {
    return "";
  }

  return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
}
