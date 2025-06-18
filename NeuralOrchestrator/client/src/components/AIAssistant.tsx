import { useState } from 'react';
import { useIDEStore } from '@/stores/ideStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, User, Send, Cpu, Brain, Zap } from 'lucide-react';

const mockAgentTypes = [
  { id: 'architect', name: 'Code Architect', icon: Brain, color: 'ibm-blue' },
  { id: 'analyzer', name: 'Neural Analyst', icon: Zap, color: 'ibm-purple' },
  { id: 'optimizer', name: 'Performance Expert', icon: Cpu, color: 'ibm-green' }
];

const mockInitialMessages = [
  {
    id: '1',
    role: 'assistant' as const,
    content: "I've analyzed your neural network orchestrator. The agent distribution across 5 cortex lobes looks optimal. Should I suggest improvements for the connection patterns?",
    timestamp: new Date(Date.now() - 300000),
    agentType: 'architect'
  },
  {
    id: '2',
    role: 'user' as const,
    content: "Yes, please analyze the neural connections and suggest optimizations for better load balancing.",
    timestamp: new Date(Date.now() - 180000)
  },
  {
    id: '3',
    role: 'assistant' as const,
    content: "Based on the current network topology, I recommend implementing adaptive connection weights. This will improve task routing efficiency by 23%.\n\n```typescript\nconst weights = agent.calculateConnectionWeights();\n```",
    timestamp: new Date(Date.now() - 120000),
    agentType: 'analyzer'
  }
];

export function AIAssistant() {
  const [inputMessage, setInputMessage] = useState('');
  const { chatMessages, addChatMessage } = useIDEStore();
  
  // Use mock messages if no chat messages in store
  const displayMessages = chatMessages.length > 0 ? chatMessages : mockInitialMessages;

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    // Add user message
    addChatMessage({
      role: 'user',
      content: inputMessage
    });

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I'll analyze that code pattern and provide optimized suggestions.",
        "Let me run a neural network analysis on your current architecture.",
        "Based on the agent performance metrics, here are my recommendations...",
        "I've identified several optimization opportunities in your code structure."
      ];
      
      addChatMessage({
        role: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
        agentType: mockAgentTypes[Math.floor(Math.random() * mockAgentTypes.length)].id
      });
    }, 1000);

    setInputMessage('');
  };

  const getAgentInfo = (agentType?: string) => {
    return mockAgentTypes.find(agent => agent.id === agentType) || mockAgentTypes[0];
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-80 carbon-bg-90 carbon-border-80 border-l flex flex-col">
      {/* Header */}
      <div className="p-3 carbon-border-80 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">AI Development Partner</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 ibm-green-bg rounded-full"></div>
            <span className="text-xs carbon-text-40">Active</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 mt-2">
          <div className="px-2 py-1 bg-blue-500/20 ibm-blue text-xs rounded">GPT-4</div>
          <div className="px-2 py-1 bg-purple-500/20 ibm-purple text-xs rounded">Claude</div>
          <div className="px-2 py-1 bg-green-500/20 ibm-green text-xs rounded">Gemini</div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {displayMessages.map((message) => {
            const agentInfo = getAgentInfo(message.agentType);
            const IconComponent = message.role === 'assistant' ? agentInfo.icon : User;
            
            return (
              <div
                key={message.id}
                className={`p-3 rounded-lg ${
                  message.role === 'assistant' 
                    ? 'carbon-bg-80' 
                    : 'bg-blue-500/10 ml-6'
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <IconComponent className={`w-4 h-4 ${
                    message.role === 'assistant' ? agentInfo.color : 'carbon-text-40'
                  }`} />
                  <span className="text-xs font-medium">
                    {message.role === 'assistant' ? agentInfo.name : 'You'}
                  </span>
                  <span className="text-xs carbon-text-40 ml-auto">
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {message.content.includes('```') ? (
                    <div>
                      {message.content.split('```').map((part, index) => 
                        index % 2 === 0 ? (
                          <span key={index}>{part}</span>
                        ) : (
                          <div key={index} className="mt-2 p-2 carbon-bg-90 rounded text-xs font-mono">
                            <div className="ibm-purple text-xs mb-1">typescript</div>
                            {part.trim()}
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-3 carbon-border-80 border-t">
        <div className="flex items-center space-x-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask AI about your code..."
            className="flex-1 carbon-bg-80 carbon-border-70 border focus:border-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button
            onClick={handleSendMessage}
            size="sm"
            className="ibm-blue-bg text-white hover:bg-blue-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
