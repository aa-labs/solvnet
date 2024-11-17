const Footer = () => (
  <footer
    className="bg-white shadow-md mt-8 h-16 border-t-2 border-[#88AB8E]"
    style={{ background: "url(/img/floor.svg) center repeat" }}
  >
    <div className="container mx-auto px-4 h-full flex justify-between items-center">
      <p
        className="text-sm"
        style={{
          backgroundColor: "#AFC8AD",
          clipPath: "polygon(3% 0, 100% 0%, 97% 100%, 0% 100%)",
          padding: "4px 12px",
        }}
      >
        Team <span className="underline">SolvNet</span>
      </p>
      <div
        className="flex space-x-4"
        style={{
          backgroundColor: "#AFC8AD",
          clipPath: "polygon(3% 0, 100% 0%, 97% 100%, 0% 100%)",
          padding: "4px 12px",
        }}
      >
        <a
          href="#"
          className="underline hover:text-gray-700 transition duration-300"
        >
          Solver Dashboard
        </a>
        <a
          href="#"
          className="underline hover:text-gray-700 transition duration-300"
        >
          Solver Explorer
        </a>
      </div>
    </div>
  </footer>
);

export default Footer;
