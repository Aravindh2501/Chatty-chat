import { CheckIcon } from "@heroicons/react/24/outline";

const getStatusIcon = (status) => {
  if (status === "sent") {
    return <CheckIcon className="w-3 h-3 stroke-[3px] text-base-content/50" />;
  }
  if (status === "delivered") {
    return (
      <div className="flex -space-x-1">
        <CheckIcon className="w-3 h-3 stroke-[3px] text-base-content/50" />
        <CheckIcon className="w-3 h-3 stroke-[3px] text-base-content/50" />
      </div>
    );
  }
  if (status === "read") {
    return (
      <div className="flex -space-x-1">
        <CheckIcon className="w-3 h-3 stroke-[3px] text-primary" />
        <CheckIcon className="w-3 h-3 stroke-[3px] text-primary" />
      </div>
    );
  }
  return null;
};

export default getStatusIcon;
