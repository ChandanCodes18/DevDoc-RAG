import { useState, useRef, useEffect } from "react";
import "./App.css";
import { motion, AnimatePresence } from "framer-motion";
import OrbVisualizer from "./components/orbVisualizer";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [repositories, setRepositories] = useState([
    { id: 1, repo_name: "Test Repo" },
  ]);
  const [activeRepoId, setActiveRepoId] = useState(1);
  const [gitUrl, setGitUrl] = useState("");
  const [isAttachOpen, setIsAttachOpen] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const messagesEndRef = useRef(null);
  const inChat = messages.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if(!file) return;

    setIsLoading(true);
    setIsAttachOpen(false);

    const formData = new FormData();
    formData.append("codeFile",file);

    try {
      const res = await fetch(`${API_URL}/api/upload/zip`, {
        method: "POST",
        body: formData,
      })

      const data = await res.json();

      setRepositories((prev) => [...prev, {id: data.repoId, repo_name: data.repoName }]);
      setActiveRepoId(data.repoId);

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Successfully Ingested Project" },
      ]);

      setIsLoading(false);

    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "⚠️ Could not reach the server. Make sure the backend is running.",
        },
      ]);
    }
  };
  const handleGithubImport = async () => {};

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    setMessages((prev) => [...prev, { sender: "user", text: trimmed }]);
    setInputValue("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          repoId: activeRepoId,
          history: messages,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: data.answer || "No response received." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "⚠️ Could not reach the server. Make sure the backend is running.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const markdownComponents = {
    code({ inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "text";
      const code = String(children).replace(/\n$/, "");
      if (!inline && match) {
        return (
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={language}
            PreTag="div"
            {...props}
          >
            {code}
          </SyntaxHighlighter>
        );
      }
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className="app-wrapper">
      {/* Sidebar: Left Panel */}
      <div className={`left-panel ${isSidebarOpen ? "open" : ""}`}>
        <h3>Projects</h3>
        <div className="repo-list">
          {repositories.map((repo) => (
            <button
              key={repo.id}
              className={`repo-item ${repo.id === activeRepoId ? "active" : ""}`}
              onClick={() => {
                setActiveRepoId(repo.id);
                setIsSidebarOpen(false);
              }}
            >
              {repo.repo_name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area: Right Panel */}
      <div className="right-panel">
        <div className="header-row">
          <div className="header-pill">DevDocs AI</div>
          <button
            className="menu-toggle"
            type="button"
            aria-label="Toggle sidebar"
            aria-expanded={isSidebarOpen}
            onClick={() => setIsSidebarOpen((isOpen) => !isOpen)}
          >
            ☰
          </button>
        </div>

        <AnimatePresence>
          {!inChat && (
            <motion.div
              className="welcome-container"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="welcome-text">
                <h1>Hi Chandan!</h1>
                <h2>How can I help you today?</h2>
              </div>
              <div className="welcome-orb-zone">
                <OrbVisualizer isLoading={isLoading} small={false} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {inChat && (
          <div className="message-list">
            {messages.map((msg, index) => {
              const isLatest = index === messages.length - 1;
              const showOrb = msg.sender === "bot" && isLatest && !isLoading;

              return (
                <div key={index} className={`message-row ${msg.sender}`}>
                  {msg.sender === "bot" && (
                    <div className="bot-avatar-orb">
                      {showOrb && (
                        <OrbVisualizer isLoading={false} small={true} />
                      )}
                    </div>
                  )}
                  <div className={`message-bubble ${msg.sender}`}>
                    {msg.sender === "bot" ? (
                      <ReactMarkdown components={markdownComponents}>
                        {msg.text}
                      </ReactMarkdown>
                    ) : (
                      msg.text
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="message-row bot typing-row">
                <div className="bot-avatar-orb">
                  <OrbVisualizer isLoading={true} small={true} />
                </div>
                <div className="message-bubble bot typing">
                  <div className="typing-dot-1" />
                  <div className="typing-dot-2" />
                  <div className="typing-dot-3" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="bottom-dock">
          {isAttachOpen && (
            <div className="attach-popup">
              <input
                type="file"
                id="zip-upload"
                accept=".zip"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />

              <label htmlFor="zip-upload" className="upload-label-btn">
                Upload Zip Codebase
              </label>

              <input
                type="text"
                placeholder="https://github.com/username/repo"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
              />
              <button type="button" onClick={handleGithubImport}>
                Import
              </button>
            </div>
          )}
          <div className="input-bar">
            <button
              className={`attach-btn ${isAttachOpen ? "open" : ""}`}
              onClick={() => setIsAttachOpen(!isAttachOpen)}
              type="button"
              aria-label="Attach codebase"
            >
              +
            </button>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              disabled={isLoading}
            />

            <button
              className="send-btn"
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
