export const calculatePrice = ({ pages, color, binding }) => {
  const isColor = color?.toLowerCase() === 'color';
  const pricePerPage = isColor ? 0.80 : 0.15;

  let bindingCost = 0;
  if (pages > 5 && binding) {
    const b = binding.toLowerCase();
    if (b === 'spiral') bindingCost = 5.00;
    else if (b === 'hardcover') bindingCost = 15.00;
    else if (b === 'softcover') bindingCost = 10.00;
    else if (b === 'staple') bindingCost = 1.50;
    else if (b === 'glue') bindingCost = 5.00;
  }

  return (pages * pricePerPage) + bindingCost;
};