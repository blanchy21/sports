"use client";

import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  Calendar,
  PieChart,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function MonetisationPage() {
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-primary" />
              <span>Monetisation</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Track your earnings and rewards from the Hive blockchain
            </p>
          </div>
          <Button className="flex items-center space-x-2">
            <Wallet className="h-4 w-4" />
            <span>Withdraw</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <h3 className="text-2xl font-bold mt-1">$1,234.56</h3>
                <p className="text-xs text-green-500 flex items-center mt-2">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +12.5% from last month
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <h3 className="text-2xl font-bold mt-1">$156.78</h3>
                <p className="text-xs text-green-500 flex items-center mt-2">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +8.3% growth
                </p>
              </div>
              <div className="p-3 bg-teal-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-teal-500" />
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <h3 className="text-2xl font-bold mt-1">$89.45</h3>
                <p className="text-xs text-muted-foreground mt-2">
                  Available in 7 days
                </p>
              </div>
              <div className="p-3 bg-cyan-500/10 rounded-lg">
                <Calendar className="h-6 w-6 text-cyan-500" />
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Posts</p>
                <h3 className="text-2xl font-bold mt-1">47</h3>
                <p className="text-xs text-muted-foreground mt-2">
                  23 this month
                </p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <FileText className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Earnings Chart */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg flex items-center space-x-2">
                <PieChart className="h-5 w-5 text-primary" />
                <span>Earnings Overview</span>
              </h3>
              <select className="text-sm border rounded-md px-3 py-1.5 bg-background">
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>Last year</option>
              </select>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Author Rewards</span>
                  <span className="font-medium">$789.23</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '64%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Curation Rewards</span>
                  <span className="font-medium">$345.67</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: '28%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Beneficiary Rewards</span>
                  <span className="font-medium">$99.66</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" style={{ width: '8%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performing Posts */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold text-lg flex items-center space-x-2 mb-6">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>Top Performing Posts</span>
            </h3>
            
            <div className="space-y-4">
              {[
                { title: "The Evolution of Basketball", earnings: "$45.23", views: "2.3K" },
                { title: "Soccer Tactics: The False 9", earnings: "$38.90", views: "1.8K" },
                { title: "Tennis Mental Game", earnings: "$32.15", views: "1.5K" },
                { title: "NFL Draft Analysis 2024", earnings: "$28.67", views: "1.2K" },
              ].map((post, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-sm line-clamp-1">{post.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{post.views} views</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{post.earnings}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-card border rounded-lg p-6">
          <h3 className="font-semibold text-lg flex items-center space-x-2 mb-6">
            <Wallet className="h-5 w-5 text-primary" />
            <span>Recent Transactions</span>
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Post</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { date: "Jan 15, 2024", type: "Author Reward", post: "The Evolution of Basketball", amount: "+$45.23", status: "Completed" },
                  { date: "Jan 14, 2024", type: "Curation Reward", post: "Soccer Tactics Analysis", amount: "+$12.34", status: "Completed" },
                  { date: "Jan 13, 2024", type: "Author Reward", post: "Tennis Mental Game", amount: "+$32.15", status: "Completed" },
                  { date: "Jan 12, 2024", type: "Beneficiary", post: "NFL Draft 2024", amount: "+$8.90", status: "Pending" },
                  { date: "Jan 11, 2024", type: "Author Reward", post: "MLB Season Preview", amount: "+$28.67", status: "Completed" },
                ].map((transaction, index) => (
                  <tr key={index} className="border-b hover:bg-accent transition-colors">
                    <td className="py-3 px-4 text-sm">{transaction.date}</td>
                    <td className="py-3 px-4 text-sm">{transaction.type}</td>
                    <td className="py-3 px-4 text-sm max-w-xs truncate">{transaction.post}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-green-500">{transaction.amount}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        transaction.status === "Completed" 
                          ? "bg-green-500/10 text-green-500" 
                          : "bg-yellow-500/10 text-yellow-500"
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hive Account Info */}
        <div className="bg-gradient-to-r from-primary via-teal-500 to-cyan-500 rounded-lg p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-2">Hive Account Connected</h3>
              <p className="text-sm opacity-90 mb-4">@johndoe • Reputation: 67</p>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm opacity-75">HIVE Balance</p>
                  <p className="text-xl font-bold">1,234.56</p>
                </div>
                <div>
                  <p className="text-sm opacity-75">HBD Balance</p>
                  <p className="text-xl font-bold">567.89</p>
                </div>
                <div>
                  <p className="text-sm opacity-75">HP</p>
                  <p className="text-xl font-bold">5,432.10</p>
                </div>
              </div>
            </div>
            
            <Button variant="outline" className="bg-white text-primary hover:bg-white/90">
              View on Hive
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

